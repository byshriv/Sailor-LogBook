package work.shriv.sailorlogbook.proof

import android.Manifest
import android.app.*
import android.content.*
import android.content.pm.PackageManager
import android.os.Build
import java.time.*

object NativeReminders {
    private fun prefs(context: Context) = context.getSharedPreferences("native-reminder", Context.MODE_PRIVATE)
    private fun alarm(context: Context) = PendingIntent.getBroadcast(context, 30,
        Intent(context, ReminderReceiver::class.java).setAction("work.shriv.logbook.REMIND"),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun allowed(context: Context): Boolean {
        val manager = context.getSystemService(NotificationManager::class.java)
        return (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) &&
            manager.areNotificationsEnabled() && manager.getNotificationChannel("daily")?.importance != NotificationManager.IMPORTANCE_NONE
    }
    fun configure(context: Context, enabled: Boolean, time: String, logged: Boolean) {
        require(time.matches(Regex("([01][0-9]|2[0-3]):[0-5][0-9]")))
        require(prefs(context).edit().putBoolean("enabled", enabled).putString("time", time)
            .putString("loggedDate", if (logged) LocalDate.now().toString() else "").commit())
        schedule(context)
    }
    fun schedule(context: Context) {
        val manager = context.getSystemService(AlarmManager::class.java)
        manager.cancel(alarm(context))
        val p = prefs(context)
        if (!p.getBoolean("enabled", false) || !allowed(context)) return
        val now = ZonedDateTime.now()
        var next = now.toLocalDate().atTime(LocalTime.parse(p.getString("time", "21:00"))).atZone(now.zone)
        if (!next.isAfter(now)) next = next.plusDays(1)
        // Gentle daily reminder: inexact, no exact-alarm privilege. OS may delay delivery.
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.toInstant().toEpochMilli(), alarm(context))
    }
    private fun notify(context: Context, id: Int) {
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("daily", "Daily reminder", NotificationManager.IMPORTANCE_DEFAULT))
        val notification = Notification.Builder(context, "daily").setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Logbook").setContentText("How was your day? Log the little things.")
            .setVisibility(Notification.VISIBILITY_PRIVATE).setAutoCancel(true)
            .setContentIntent(ProofWidgets.launch(context, true)).build()
        manager.notify(id, notification)
    }
    fun test(context: Context): Boolean {
        if (!allowed(context)) return false
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("daily", "Daily reminder", NotificationManager.IMPORTANCE_DEFAULT))
        if (manager.getNotificationChannel("daily").importance == NotificationManager.IMPORTANCE_NONE) return false
        notify(context, 31); return true
    }
    fun deliver(context: Context) {
        val p = prefs(context); val date = LocalDate.now().toString()
        if (!LocalTime.now().isBefore(LocalTime.parse(p.getString("time", "21:00"))) && p.getBoolean("enabled", false) && allowed(context) && p.getString("loggedDate", "") != date && p.getString("delivered", "") != date) {
            val manager = context.getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(NotificationChannel("daily", "Daily reminder", NotificationManager.IMPORTANCE_DEFAULT))
            val channel = manager.getNotificationChannel("daily")
            if (channel.importance != NotificationManager.IMPORTANCE_NONE) {
                require(p.edit().putString("delivered", date).commit())
                notify(context, 30)
            }
        }
        schedule(context)
    }
}
class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        try {
            if (intent.action == "work.shriv.logbook.REMIND") NativeReminders.deliver(context)
            else NativeReminders.schedule(context)
            ProofWidgets.refresh(context)
        } catch (_: Exception) { /* Permission/storage can change while receiver is running. Retry on foreground. */ }
    }
}
