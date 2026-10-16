package com.glorymukami.tracker;

import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * The timer that is running, if any. The app republishes each minute while one
 * runs, so this is accurate to the minute rather than ticking live.
 */
public class TimerWidget extends BaseTrackerWidget {

    @Override
    protected int layoutId() {
        return R.layout.widget_timer;
    }

    @Override
    protected int rootId() {
        return R.id.timer_root;
    }

    @Override
    protected String target() {
        return "time";
    }

    @Override
    protected void bind(Context context, RemoteViews views, JSONObject summary) {
        String timer = summary == null ? "" : summary.optString("timer", "");
        String text;
        if (summary == null) {
            text = "Open the app once to start";
        } else if (timer.isEmpty()) {
            text = "No timer running";
        } else {
            text = timer;
        }
        views.setTextViewText(R.id.timer_text, text);
    }
}
