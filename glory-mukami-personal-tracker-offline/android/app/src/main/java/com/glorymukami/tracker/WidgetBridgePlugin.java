package com.glorymukami.tracker;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The nudge from the web layer to the home-screen widget.
 *
 * The numbers themselves travel through Capacitor's Preferences plugin, which
 * writes the "CapacitorStorage" SharedPreferences file that TrackerWidget
 * reads. This plugin only says "redraw now", so a glass of water logged in the
 * app shows on the home screen at once rather than at the next periodic
 * update.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        Context context = getContext();
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TrackerWidget.class));

        if (ids.length > 0) {
            Intent intent = new Intent(context, TrackerWidget.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
        }
        call.resolve();
    }
}
