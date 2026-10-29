package work.shriv.sailorlogbook.proof;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.content.Intent;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetProjectionPlugin.class);
        registerPlugin(LogbookNativePlugin.class);
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new androidx.activity.OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                com.getcapacitor.PluginHandle handle = getBridge().getPlugin("LogbookNative");
                if (handle != null) ((LogbookNativePlugin) handle.getInstance()).back();
            }
        });
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}
