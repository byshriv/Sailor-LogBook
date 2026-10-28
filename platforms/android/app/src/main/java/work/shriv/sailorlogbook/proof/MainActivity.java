package work.shriv.sailorlogbook.proof;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.Intent;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetProjectionPlugin.class);
        super.onCreate(savedInstanceState);
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}
