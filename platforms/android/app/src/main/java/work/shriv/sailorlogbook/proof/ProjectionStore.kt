package work.shriv.sailorlogbook.proof

import android.content.Context
import android.util.AtomicFile
import org.json.JSONObject
import java.io.File
import java.time.Instant
import java.time.LocalDate

/** Disposable projection only. No canonical records, tokens or keys. */
class ProjectionStore(private val context: Context) {
    private val file = AtomicFile(File(context.noBackupFilesDir, "widget-proof.json"))
    private val preferences = context.getSharedPreferences("widget-device-policy", Context.MODE_PRIVATE)

    fun read(): JSONObject? = synchronized(LOCK) {
        try { JSONObject(file.openRead().use { it.readBytes().toString(Charsets.UTF_8) }) }
        catch (_: Exception) { null }
    }

    fun publish(input: JSONObject): Boolean = synchronized(LOCK) {
        require(input.getInt("schema") == 1)
        require(input.get("schema") is Number && input.getDouble("schema") == 1.0)
        val revision = input.getLong("revision")
        require(revision >= 0 && revision <= 9007199254740991L)
        val day = LocalDate.parse(input.getString("wallDate")).toString()
        val minutes = input.getInt("loggedMinutes")
        val count = input.getInt("bestCount")
        require(input.get("revision") is Number && input.getDouble("revision") == revision.toDouble())
        require(input.get("loggedMinutes") is Number && input.getDouble("loggedMinutes") == minutes.toDouble())
        require(input.get("bestCount") is Number && input.getDouble("bestCount") == count.toDouble())
        require(minutes in 0..1440 && count in 0..4)
        val updated = Instant.parse(input.getString("updatedAt")).toString()
        if (revision <= (read()?.optLong("revision", -1) ?: -1)) return false
        val clean = JSONObject().put("schema", 1).put("revision", revision)
            .put("wallDate", day).put("loggedMinutes", minutes).put("bestCount", count)
            .put("updatedAt", updated)
        if (preferences.getBoolean("showPersonalText", false) && !preferences.getBoolean("locked", false)) {
            val text = input.optString("personalText", "").take(500)
            if (text.isNotEmpty()) clean.put("personalText", text)
        }
        val stream = file.startWrite()
        try { stream.write(clean.toString().toByteArray(Charsets.UTF_8)); file.finishWrite(stream) }
        catch (e: Exception) { file.failWrite(stream); throw e }
        true
    }

    fun publishCurrent(input: JSONObject): Boolean = synchronized(LOCK) {
        input.put("revision", (read()?.optLong("revision", -1) ?: -1) + 1)
        publish(input)
    }
    fun textVisibility() = preferences.getBoolean("showPersonalText", false)
    fun privacyLock(locked: Boolean) {
        require(preferences.edit().putBoolean("locked", locked).commit())
        clear()
    }
    fun clear() = synchronized(LOCK) {
        file.delete()
        require(!file.baseFile.exists() && !File(file.baseFile.path + ".bak").exists() && !File(file.baseFile.path + ".new").exists())
    }
    fun setTextVisibility(show: Boolean) = synchronized(LOCK) {
        require(preferences.edit().putBoolean("showPersonalText", show).commit())
        // Clear the old projection on either transition; only a fresh commit can republish.
        clear()
    }
    companion object { private val LOCK = Any() }
}
