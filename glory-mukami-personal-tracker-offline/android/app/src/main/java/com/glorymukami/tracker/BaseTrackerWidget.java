package com.glorymukami.tracker;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * What every home-screen widget has in common.
 *
 * No widget computes anything. The web app writes one small summary whenever
 * the journal changes (see client/src/components/NativeBridges.tsx), already
 * reduced to what may be shown on a home screen, and each widget only draws
 * its slice of it. That keeps the widgets and the app from ever disagreeing,
 * and means a widget can never reveal more than the app chose to hand it. With
 * nothing written yet, a widget says so instead of showing zeros as if true.
 *
 * A tap anywhere opens the app at the page the widget belongs to.
 */
public abstract class BaseTrackerWidget extends AppWidgetProvider {

    /** The file @capacitor/preferences writes, and the key the app uses. */
    private static final String PREFS = "CapacitorStorage";
    private static final String KEY = "widget";

    protected abstract int layoutId();

    protected abstract int rootId();

    /** The journal page a tap opens, e.g. "water". */
    protected abstract String target();

    /** Fills the layout. {@code summary} is null until the app has written one. */
    protected abstract void bind(Context context, RemoteViews views, JSONObject summary);

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, build(context));
        }
    }

    final RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId());
        bind(context, views, readSummary(context));
        views.setOnClickPendingIntent(rootId(), openApp(context, target()));
        return views;
    }

    static JSONObject readSummary(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY, null);
        if (raw == null) return null;
        try {
            return new JSONObject(raw);
        } catch (Exception error) {
            return null;
        }
    }

    /**
     * A pending intent that opens the app and asks for {@code view}.
     *
     * The request code and data URI are per page: PendingIntents are matched
     * without looking at extras, so two widgets sharing one would end up
     * opening whichever page was registered last.
     */
    static PendingIntent openApp(Context context, String view) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setAction(Intent.ACTION_MAIN);
        intent.setData(Uri.parse("tracker://widget/" + view));
        intent.putExtra(MainActivity.EXTRA_OPEN_VIEW, view);
        return PendingIntent.getActivity(
            context,
            view.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    /** Shows a line, or hides its view when there is nothing to put in it. */
    static void line(RemoteViews views, int viewId, String value) {
        if (value == null || value.isEmpty()) {
            views.setViewVisibility(viewId, View.GONE);
        } else {
            views.setViewVisibility(viewId, View.VISIBLE);
            views.setTextViewText(viewId, value);
        }
    }

    /** The water bar's fill, 0-100; 0 when there is no goal to measure against. */
    static int percent(int value, int goal) {
        if (goal <= 0) return 0;
        return Math.max(0, Math.min(100, (int) Math.round(value * 100.0 / goal)));
    }

    static JSONArray array(JSONObject summary, String key) {
        if (summary == null) return new JSONArray();
        JSONArray found = summary.optJSONArray(key);
        return found == null ? new JSONArray() : found;
    }
}
