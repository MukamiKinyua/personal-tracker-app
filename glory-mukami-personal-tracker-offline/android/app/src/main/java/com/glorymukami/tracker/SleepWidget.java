package com.glorymukami.tracker;

import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONObject;

/** Last night's sleep. Blank in privacy mode, because the app sends nothing. */
public class SleepWidget extends BaseTrackerWidget {

    @Override
    protected int layoutId() {
        return R.layout.widget_sleep;
    }

    @Override
    protected int rootId() {
        return R.id.sleep_root;
    }

    @Override
    protected String target() {
        return "sleep";
    }

    @Override
    protected void bind(Context context, RemoteViews views, JSONObject summary) {
        if (summary == null) {
            views.setTextViewText(R.id.sleep_hours, "—");
            views.setTextViewText(R.id.sleep_note, "Open the app once to start");
            return;
        }
        JSONObject sleep = summary.optJSONObject("sleep");
        if (sleep == null) {
            views.setTextViewText(R.id.sleep_hours, "—");
            views.setTextViewText(
                R.id.sleep_note,
                summary.optBoolean("hidden", false) ? "Hidden in privacy mode" : "No sleep logged"
            );
            return;
        }
        double hours = sleep.optDouble("hours", 0);
        views.setTextViewText(R.id.sleep_hours, trim(hours) + " h");
        String quality = sleep.optString("quality", "");
        views.setTextViewText(
            R.id.sleep_note,
            quality.isEmpty() ? "last night" : quality + " · last night"
        );
    }

    private static String trim(double hours) {
        return hours == Math.floor(hours) ? String.valueOf((int) hours) : String.valueOf(hours);
    }
}
