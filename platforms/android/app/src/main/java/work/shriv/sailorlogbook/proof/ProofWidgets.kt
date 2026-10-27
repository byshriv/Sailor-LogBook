package work.shriv.sailorlogbook.proof

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import java.time.LocalDate

object ProofWidgets {
    fun action(raw: String?): String? = when (raw) {
        "sailorlogbook://widget/quick-log" -> "quick-log"
        "sailorlogbook://widget/today" -> "today"
        else -> null
    }
    fun launch(context: Context, quick: Boolean): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse("sailorlogbook://widget/${if (quick) "quick-log" else "today"}")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(context, if (quick) 1 else 2, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
    fun update(context: Context, manager: AppWidgetManager, ids: IntArray, quick: Boolean) {
        for (id in ids) {
            val view = RemoteViews(context.packageName, R.layout.proof_widget)
            val value = ProjectionStore(context).read()
            val stale = value?.optString("wallDate") != LocalDate.now().toString()
            val text = when {
                quick -> "Quick log · Open Logbook"
                value == null -> "Open Logbook · no saved projection"
                stale -> "Last updated ${value.optString("wallDate")} · Open Logbook"
                else -> "${value.optInt("loggedMinutes")} min · ${value.optInt("bestCount")} best things" +
                    (if (value.has("personalText")) "\n${value.optString("personalText")}" else "") +
                    "\nUpdated ${value.optString("updatedAt")}" 
            }
            view.setTextViewText(R.id.widget_label, text)
            view.setOnClickPendingIntent(R.id.widget_label, launch(context, quick))
            manager.updateAppWidget(id, view)
        }
    }
    fun refresh(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        update(context, manager, manager.getAppWidgetIds(ComponentName(context, QuickLogWidget::class.java)), true)
        update(context, manager, manager.getAppWidgetIds(ComponentName(context, TodayWidget::class.java)), false)
    }
}
class QuickLogWidget : AppWidgetProvider() {
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action in listOf(Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_TIME_CHANGED)) ProofWidgets.refresh(context)
    }
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = ProofWidgets.update(context, manager, ids, true)
}
class TodayWidget : AppWidgetProvider() {
    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action in listOf(Intent.ACTION_DATE_CHANGED, Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_TIME_CHANGED)) ProofWidgets.refresh(context)
    }
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = ProofWidgets.update(context, manager, ids, false)
}
