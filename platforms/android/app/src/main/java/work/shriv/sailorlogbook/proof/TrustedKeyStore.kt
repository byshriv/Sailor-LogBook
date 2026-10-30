package work.shriv.sailorlogbook.proof

import android.app.KeyguardManager
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** One device-local AES wrapper. Never backed up; never stores a passphrase/token. */
class TrustedKeyStore(private val context: Context) {
    private val file = AtomicFile(File(context.noBackupFilesDir, "trusted-key.json"))
    private val alias = "slb-content-wrapper-v1"
    private fun store() = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    private fun boundary() {
        val guard = context.getSystemService(KeyguardManager::class.java)
        require(guard.isDeviceSecure && !guard.isDeviceLocked) { "Unlock the secure device first" }
    }
    fun enroll(id: String, raw: String) {
        boundary()
        require(id.matches(Regex("[a-f0-9]{64}")))
        val bytes = Base64.decode(raw, Base64.NO_WRAP)
        require(bytes.size == 32)
        try {
            forget()
            val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
            generator.init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUnlockedDeviceRequired(true).build())
            val key = generator.generateKey()
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key); cipher.updateAAD(id.toByteArray())
            write(JSONObject().put("id", id).put("locked", false)
                .put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
                .put("data", Base64.encodeToString(cipher.doFinal(bytes), Base64.NO_WRAP)))
        } finally { bytes.fill(0) }
    }
    private fun read() = JSONObject(file.openRead().use { it.readBytes().toString(Charsets.UTF_8) })
    private fun write(value: JSONObject) {
        val out = file.startWrite()
        try { out.write(value.toString().toByteArray()); file.finishWrite(out) }
        catch (e: Exception) { file.failWrite(out); throw e }
    }
    fun locked(): Boolean = read().getBoolean("locked")
    fun lock() { if (File(context.noBackupFilesDir, "trusted-key.json").exists()) write(read().put("locked", true)) }
    fun restore(id: String, authenticated: Boolean): String {
        boundary()
        val value = read()
        require(value.getString("id") == id) { "Trust belongs to different credentials" }
        require(!value.getBoolean("locked") || authenticated) { "Authentication required" }
        val key = store().getKey(alias, null) as SecretKey
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, Base64.decode(value.getString("iv"), Base64.NO_WRAP)))
        cipher.updateAAD(id.toByteArray())
        val bytes = cipher.doFinal(Base64.decode(value.getString("data"), Base64.NO_WRAP))
        try {
            require(bytes.size == 32)
            if (authenticated) write(value.put("locked", false))
            return Base64.encodeToString(bytes, Base64.NO_WRAP)
        } finally { bytes.fill(0) }
    }
    fun forget() {
        file.delete()
        require(!file.baseFile.exists() && !File(file.baseFile.path + ".bak").exists() && !File(file.baseFile.path + ".new").exists())
        val ks = store(); if (ks.containsAlias(alias)) ks.deleteEntry(alias)
        require(!ks.containsAlias(alias))
    }
}
