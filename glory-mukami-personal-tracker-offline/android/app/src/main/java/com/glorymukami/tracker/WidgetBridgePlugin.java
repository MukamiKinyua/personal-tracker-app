package com.glorymukami.tracker;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The link between the web layer and the home-screen widgets, in both
 * directions.
 *
 * Outward: the numbers themselves travel through Capacitor's Preferences
 * plugin, which writes the "CapacitorStorage" SharedPreferences file the
 * widgets read. {@code refresh} only says "redraw now", so a glass of water
 * logged in the app shows on the home screen at once rather than at the next
 * periodic update.
 *
 * Inward: {@code takeLaunchTarget} hands the web layer the page a widget tap
 * asked for.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    /** Every widget this app offers; each is redrawn on refresh. */
    private static final Class<?>[] WIDGETS = {
        TrackerWidget.class,
        WaterWidget.class,
        TasksWidget.class,
        UpcomingWidget.class,
        TimerWidget.class,
        SleepWidget.class,
        QuickAddWidget.class,
    };

    @PluginMethod
    public void refresh(PluginCall call) {
        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);

        for (Class<?> widget : WIDGETS) {
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, widget));
            if (ids.length == 0) continue;

            Intent intent = new Intent(context, widget);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void takeLaunchTarget(PluginCall call) {
        JSObject result = new JSObject();
        String view = MainActivity.takePendingView();
        // JSObject.put(String, String) with null is not a null in JS; omit it.
        if (view != null) result.put("view", view);
        call.resolve(result);
    }
}
