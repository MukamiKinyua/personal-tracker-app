package com.glorymukami.tracker;

import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * Four shortcuts straight to the page where the thing is logged. It shows no
 * journal data at all, so it is safe on any home screen.
 */
public class QuickAddWidget extends BaseTrackerWidget {

    @Override
    protected int layoutId() {
        return R.layout.widget_quick_add;
    }

    @Override
    protected int rootId() {
        return R.id.quick_root;
    }

    @Override
    protected String target() {
        return "dashboard";
    }

    @Override
    protected void bind(Context context, RemoteViews views, JSONObject summary) {
        views.setOnClickPendingIntent(R.id.quick_water, openApp(context, "water"));
        views.setOnClickPendingIntent(R.id.quick_task, openApp(context, "tasks"));
        views.setOnClickPendingIntent(R.id.quick_sleep, openApp(context, "sleep"));
        views.setOnClickPendingIntent(R.id.quick_reflect, openApp(context, "reflections"));
    }
}
