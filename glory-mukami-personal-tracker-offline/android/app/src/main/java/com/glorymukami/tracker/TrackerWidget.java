package com.glorymukami.tracker;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * The home-screen widget: today's water, open tasks, and a running timer.
 *
 * It never computes anything. The app writes a small summary whenever the
 * journal changes (see client/src/components/NativeBridges.tsx) and this
 * draws it — so the widget and the app can never disagree, and a widget with
 * nothing written yet says so rather than showing zeros as if they were true.
 */
public class TrackerWidget extends AppWidgetProvider {

    /** The file @capacitor/preferences writes, and the key the app uses. */
    private static final String PREFS = "CapacitorStorage";
    private static final String KEY = "widget";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    static RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.tracker_widget);

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY, null);

        if (raw == null) {
            views.setTextViewText(R.id.widget_water, "—");
            views.setTextViewText(R.id.widget_water_label, "Open the app once to start");
            views.setTextViewText(R.id.widget_tasks, "");
            views.setTextViewText(R.id.widget_timer, "");
        } else {
            try {
                JSONObject summary = new JSONObject(raw);
                int water = summary.optInt("waterMl", 0);
                int goal = summary.optInt("waterGoalMl", 0);
                int tasks = summary.optInt("tasksOpen", 0);
                String timer = summary.optString("timer", "");

                views.setTextViewText(R.id.widget_water, water + " ml");
                views.setTextViewText(
                    R.id.widget_water_label,
                    goal > 0 ? "of " + goal + " ml today" : "water today"
                );
                views.setTextViewText(
                    R.id.widget_tasks,
                    tasks == 0 ? "Nothing open" : tasks + (tasks == 1 ? " task open" : " tasks open")
                );
                views.setTextViewText(R.id.widget_timer, timer);
            } catch (Exception error) {
                views.setTextViewText(R.id.widget_water, "—");
                views.setTextViewText(R.id.widget_water_label, "Could not read the journal");
            }
        }

        // Tapping anywhere opens the app.
        Intent open = new Intent(context, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(
            context,
            0,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pending);

        return views;
    }
}
