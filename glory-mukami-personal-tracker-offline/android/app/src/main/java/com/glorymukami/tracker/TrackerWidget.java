package com.glorymukami.tracker;

import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONObject;

/**
 * "Today": water so far, open tasks and a running timer, at a glance.
 */
public class TrackerWidget extends BaseTrackerWidget {

    @Override
    protected int layoutId() {
        return R.layout.tracker_widget;
    }

    @Override
    protected int rootId() {
        return R.id.widget_root;
    }

    @Override
    protected String target() {
        return "dashboard";
    }

    @Override
    protected void bind(Context context, RemoteViews views, JSONObject summary) {
        if (summary == null) {
            views.setTextViewText(R.id.widget_water, "—");
            views.setTextViewText(R.id.widget_water_label, "Open the app once to start");
            views.setProgressBar(R.id.widget_water_bar, 100, 0, false);
            line(views, R.id.widget_tasks, "");
            line(views, R.id.widget_timer, "");
            return;
        }

        int water = summary.optInt("waterMl", 0);
        int goal = summary.optInt("waterGoalMl", 0);
        int tasks = summary.optInt("tasksOpen", 0);

        views.setTextViewText(R.id.widget_water, water + " ml");
        views.setTextViewText(
            R.id.widget_water_label,
            goal > 0 ? "of " + goal + " ml today" : "water today"
        );
        views.setProgressBar(R.id.widget_water_bar, 100, percent(water, goal), false);
        line(
            views,
            R.id.widget_tasks,
            tasks == 0 ? "Nothing open" : tasks + (tasks == 1 ? " task open" : " tasks open")
        );
        line(views, R.id.widget_timer, summary.optString("timer", ""));
    }
}
