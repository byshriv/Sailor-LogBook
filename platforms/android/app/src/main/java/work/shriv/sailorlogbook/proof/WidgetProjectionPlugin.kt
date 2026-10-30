package work.shriv.sailorlogbook.proof

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import android.content.Intent

@CapacitorPlugin(name = "WidgetProjection")
class WidgetProjectionPlugin : Plugin() {
    override fun handleOnNewIntent(intent: Intent) {
        val action = ProofWidgets.action(intent.dataString) ?: return
        notifyListeners("widgetLaunch", JSObject().put("action", action), true)
    }
    @PluginMethod fun publish(call: PluginCall) {
        try {
            val projection = call.getObject("projection") ?: throw IllegalArgumentException("Projection required")
            val written = ProjectionStore(context).publish(projection)
            ProofWidgets.refresh(context)
            call.resolve(JSObject().put("written", written))
        } catch (_: Exception) { call.reject("Invalid projection or native storage failure") }
    }
    @PluginMethod fun publishCurrent(call: PluginCall) {
        try {
            val input = call.getObject("projection") ?: throw IllegalArgumentException()
            val written = ProjectionStore(context).publishCurrent(input)
            ProofWidgets.refresh(context)
            call.resolve(JSObject().put("written", written))
        } catch (_: Exception) { call.reject("Native projection unavailable") }
    }
    @PluginMethod fun getTextVisibility(call: PluginCall) {
        call.resolve(JSObject().put("show", ProjectionStore(context).textVisibility()))
    }
    @PluginMethod fun clear(call: PluginCall) {
        ProjectionStore(context).clear(); ProofWidgets.refresh(context); call.resolve()
    }
    @PluginMethod fun setTextVisibility(call: PluginCall) {
        ProjectionStore(context).setTextVisibility(call.getBoolean("show", false) == true)
        ProofWidgets.refresh(context); call.resolve()
    }
    @PluginMethod fun getLaunchAction(call: PluginCall) {
        val action = ProofWidgets.action(activity.intent?.dataString)
        call.resolve(JSObject().put("action", action ?: "none"))
    }
}
