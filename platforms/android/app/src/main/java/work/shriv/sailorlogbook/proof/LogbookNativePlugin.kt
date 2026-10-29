package work.shriv.sailorlogbook.proof

import android.Manifest
import android.app.Activity
import android.app.KeyguardManager
import android.content.Intent
import android.os.Build
import androidx.activity.result.ActivityResult
import com.getcapacitor.*
import com.getcapacitor.annotation.*
import org.json.JSONObject
import java.io.File

@CapacitorPlugin(name = "LogbookNative", permissions = [Permission(alias = "notifications", strings = [Manifest.permission.POST_NOTIFICATIONS])])
class LogbookNativePlugin : Plugin() {
    // Capacitor otherwise serializes activity-call options, including raw key/backup data,
    // into saved-instance state. On process death these flows require an explicit retry.
    override fun saveInstanceState(): android.os.Bundle? = null
    private val pending get() = File(context.noBackupFilesDir, "oauth-pending.json")
    private var returned: String? = null
    private var launch: String? = null
    private fun accept(intent: Intent?) {
        val raw = intent?.dataString ?: return
        val uri = intent.data ?: return
        if (uri.scheme != "sailorlogbook" || uri.userInfo != null || uri.port != -1 || uri.fragment != null) return
        val widget = ProofWidgets.action(raw)
        if (widget != null) launch = widget
        else if (uri.host == "oauth" && uri.path == "/dropbox" && raw.length <= 8192) returned = raw
        else return
        intent.data = null
        notifyListeners("return", JSObject(), true)
    }
    override fun load() { accept(activity.intent) }
    override fun handleOnNewIntent(intent: Intent) { accept(intent) }
    override fun handleOnResume() { notifyListeners("return", JSObject(), true); ProofWidgets.refresh(context) }
    fun back() { launch = "back"; notifyListeners("return", JSObject(), true) }
    @PluginMethod fun minimize(call: PluginCall) { activity.moveTaskToBack(true); call.resolve() }
    @PluginMethod fun takeLaunch(call: PluginCall) {
        val action = if (returned != null) "oauth" else launch; launch = null
        call.resolve(JSObject().put("action", action ?: "none"))
    }
    @PluginMethod fun beginOAuth(call: PluginCall) {
        try {
            val auth = call.getObject("pending") ?: throw Exception()
            val uri = android.net.Uri.parse(auth.getString("url"))
            require(uri.scheme == "https" && uri.host == "www.dropbox.com" && uri.path == "/oauth2/authorize")
            require(auth.getString("redirect") == "sailorlogbook://oauth/dropbox")
            require(uri.getQueryParameter("redirect_uri") == auth.getString("redirect"))
            require(uri.getQueryParameter("state") == auth.getString("state"))
            require(uri.getQueryParameter("client_id") == auth.getString("clientId"))
            val file = android.util.AtomicFile(pending); val out = file.startWrite()
            try { out.write(auth.toString().toByteArray()); file.finishWrite(out) }
            catch (e: Exception) { file.failWrite(out); throw e }
            activity.startActivity(Intent(Intent.ACTION_VIEW, uri)); call.resolve()
        } catch (_: Exception) { call.reject("Could not start Dropbox authorization") }
    }
    @PluginMethod fun takeOAuth(call: PluginCall) {
        try {
            val raw = returned; returned = null
            if (raw == null) { call.resolve(JSObject()); return }
            val auth = JSONObject(pending.readText()); require(pending.delete())
            call.resolve(JSObject().put("url", raw).put("pending", auth))
        } catch (_: Exception) { pending.delete(); call.reject("Authorization expired; reconnect") }
    }
    private fun authenticate(call: PluginCall, callback: String) {
        val manager = context.getSystemService(KeyguardManager::class.java)
        val intent = manager.createConfirmDeviceCredentialIntent("Logbook", "Confirm device unlock for trusted access")
        if (!manager.isDeviceSecure || intent == null) { call.reject("A secure screen lock is required"); return }
        startActivityForResult(call, intent, callback)
    }
    @PluginMethod fun enroll(call: PluginCall) { authenticate(call, "enrolled") }
    @ActivityCallback private fun enrolled(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK) { call.reject("Device authentication canceled"); return }
        try {
            TrustedKeyStore(context).enroll(call.getString("id") ?: "", call.getString("raw") ?: "")
            ProjectionStore(context).privacyLock(false)
            call.resolve()
        } catch (_: Exception) { call.reject("Device trust unavailable; use passphrase or recovery") }
    }
    @PluginMethod fun restore(call: PluginCall) {
        try {
            if (TrustedKeyStore(context).locked()) authenticate(call, "restored")
            else restoreKey(call, false)
        } catch (_: Exception) { call.reject("No usable device trust; unlock with passphrase or recovery") }
    }
    @ActivityCallback private fun restored(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode != Activity.RESULT_OK) { call.reject("Device authentication canceled"); return }
        restoreKey(call, true)
    }
    private fun restoreKey(call: PluginCall, authenticated: Boolean) {
        try {
            val raw = TrustedKeyStore(context).restore(call.getString("id") ?: "", authenticated)
            ProjectionStore(context).privacyLock(false)
            call.resolve(JSObject().put("raw", raw))
        }
        catch (_: Exception) { call.reject("Device trust unavailable; use passphrase or recovery") }
    }
    @PluginMethod fun lock(call: PluginCall) {
        try { TrustedKeyStore(context).lock(); ProjectionStore(context).privacyLock(true); ProofWidgets.refresh(context); call.resolve() }
        catch (_: Exception) { call.reject("Native lock could not be persisted; forget trust") }
    }
    @PluginMethod fun forget(call: PluginCall) {
        try { pending.delete(); returned = null; TrustedKeyStore(context).forget(); ProjectionStore(context).setTextVisibility(false); ProjectionStore(context).privacyLock(true); ProofWidgets.refresh(context); call.resolve() }
        catch (_: Exception) { call.reject("Could not forget native trust") }
    }
    @PluginMethod fun saveBackup(call: PluginCall) {
        val raw = call.getString("raw") ?: ""
        if (raw.toByteArray().size > 96 * 1024 * 1024) { call.reject("Backup exceeds transfer limit"); return }
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .setType("application/json").putExtra(Intent.EXTRA_TITLE,
                (call.getString("name") ?: "sailor-logbook-backup.json").take(100).replace(Regex("[^A-Za-z0-9._-]"), "_"))
        startActivityForResult(call, intent, "backupSaved")
    }
    @ActivityCallback private fun backupSaved(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        try {
            require(result.resultCode == Activity.RESULT_OK)
            val uri = result.data?.data ?: throw Exception()
            val bytes = (call.getString("raw") ?: "").toByteArray()
            context.contentResolver.openOutputStream(uri, "wt")!!.use { it.write(bytes) }
            val expected = java.security.MessageDigest.getInstance("SHA-256").digest(bytes)
            val digest = java.security.MessageDigest.getInstance("SHA-256")
            var size = 0L
            context.contentResolver.openInputStream(uri)!!.use { input ->
                val buffer = ByteArray(8192)
                while (true) {
                    val count = input.read(buffer); if (count < 0) break
                    size += count; require(size <= bytes.size)
                    digest.update(buffer, 0, count)
                }
            }
            require(size == bytes.size.toLong() && java.security.MessageDigest.isEqual(expected, digest.digest()))
            call.resolve()
        } catch (_: Exception) { call.reject("Backup not saved; retry and reopen the actual file to verify") }
    }
    @PluginMethod fun reminders(call: PluginCall) {
        try { NativeReminders.configure(context, call.getBoolean("enabled", false) == true, call.getString("time") ?: "21:00", call.getBoolean("logged", false) == true)
            call.resolve(JSObject().put("granted", NativeReminders.allowed(context)))
        } catch (_: Exception) { call.reject("Native reminder scheduling failed") }
    }
    @PluginMethod fun testReminder(call: PluginCall) {
        try { call.resolve(JSObject().put("requested", NativeReminders.test(context))) }
        catch (_: Exception) { call.reject("Android test notification unavailable") }
    }
    @PluginMethod fun requestNotifications(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33) requestPermissionForAlias("notifications", call, "notificationResult")
        else notificationResult(call)
    }
    @PermissionCallback private fun notificationResult(call: PluginCall) {
        call.resolve(JSObject().put("granted", NativeReminders.allowed(context)))
    }
}
