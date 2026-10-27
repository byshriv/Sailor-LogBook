package work.shriv.sailorlogbook.proof;

import static org.junit.Assert.*;
import android.content.Context;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.time.LocalDate;
import java.time.Instant;

@RunWith(AndroidJUnit4.class)
public class ProjectionTest {
    private JSONObject sample(long revision) throws Exception {
        return new JSONObject().put("schema",1).put("revision",revision)
            .put("wallDate",LocalDate.now().toString()).put("loggedMinutes",60)
            .put("bestCount",1).put("updatedAt",Instant.now().toString())
            .put("personalText","SYNTHETIC private text").put("token","never store");
    }
    @Test public void privacyPersistenceStaleAndClear() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ProjectionStore store = new ProjectionStore(context);
        store.setTextVisibility(false);
        assertNull(store.read());
        assertTrue(store.publish(sample(1)));
        JSONObject reopened = new ProjectionStore(context).read();
        assertNotNull(reopened); assertFalse(reopened.has("personalText")); assertFalse(reopened.has("token"));
        assertFalse(store.publish(sample(0))); assertEquals(1,store.read().getLong("revision"));
        try { store.publish(sample(2).put("loggedMinutes",1441)); fail("invalid accepted"); }
        catch (IllegalArgumentException expected) { }
        assertEquals(1,store.read().getLong("revision"));
        store.setTextVisibility(true); assertNull(store.read());
        assertTrue(store.publish(sample(2))); assertTrue(store.read().has("personalText"));
        store.setTextVisibility(false); assertNull(store.read());
        ProofWidgets.INSTANCE.refresh(context);
    }
    @Test public void launchActionsAreStrictAndIntentsImmutable() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("quick-log",ProofWidgets.INSTANCE.action("sailorlogbook://widget/quick-log"));
        assertEquals("today",ProofWidgets.INSTANCE.action("sailorlogbook://widget/today"));
        assertNull(ProofWidgets.INSTANCE.action("sailorlogbook://widget/today?token=x"));
        assertNull(ProofWidgets.INSTANCE.action("sailorlogbook://widget/erase"));
        assertTrue(ProofWidgets.INSTANCE.launch(context,true).isImmutable());
    }
}
