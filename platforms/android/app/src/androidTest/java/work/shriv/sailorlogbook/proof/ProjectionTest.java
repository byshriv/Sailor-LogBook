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
import android.content.Intent;
import androidx.test.core.app.ActivityScenario;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

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
        try { store.publish(sample(2).put("schema",1.5)); fail("fractional schema accepted"); }
        catch (IllegalArgumentException expected) { }
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
    private String evaluate(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(script,
            result -> { value.set(result); latch.countDown(); }));
        assertTrue("WebView evaluation timed out", latch.await(5,TimeUnit.SECONDS));
        return value.get();
    }
    @Test public void packagedWebViewCanCallTheKotlinBridge() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        ProjectionStore store = new ProjectionStore(context);
        store.setTextVisibility(false);
        Intent intent = new Intent(context,MainActivity.class)
            .setData(android.net.Uri.parse("sailorlogbook://widget/quick-log"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(intent)) {
            String result = "";
            for (int i=0;i<80;i++) {
                result = evaluate(scenario,"!!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.WidgetProjection)");
                if ("true".equals(result)) break;
                Thread.sleep(250);
            }
            assertEquals("Packaged JavaScript bridge not ready", "true", result);
            String input = sample(99).toString();
            evaluate(scenario,"window.__bridgeProof='pending'; window.Capacitor.Plugins.WidgetProjection.getLaunchAction().then(a => window.Capacitor.Plugins.WidgetProjection.publish({projection:"+input+"}).then(r => { window.__bridgeProof=a.action+':'+r.written; })).catch(e => window.__bridgeProof='error:'+e.message)");
            for (int i=0;i<80;i++) {
                result = evaluate(scenario,"window.__bridgeProof");
                if ("\"quick-log:true\"".equals(result)) break;
                Thread.sleep(250);
            }
            assertEquals("\"quick-log:true\"",result);
            assertEquals(99,store.read().getLong("revision"));
            assertFalse(store.read().has("personalText"));
        } finally { store.clear(); }
    }
}
