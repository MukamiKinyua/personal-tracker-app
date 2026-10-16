package com.glorymukami.tracker;

import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONObject;

/** Water so far today against the goal, with a progress bar. */
public class WaterWidget extends BaseTrackerWidget {

    @Override
    protected int layoutId() {
        return R.layout.widget_water;
    }

    @Override
    protected int rootId() {
        return R.id.water_root;
    }

    @Override
    protected String target() {
        return "water";
    }

    @Override
    protected void bind(Context context, RemoteViews views, JSONObject summary) {
        if (summary == null) {
            views.setTextViewText(R.id.water_amount, "—");
            views.setTextViewText(R.id.water_goal, "Open the app once to start");
            views.setProgressBar(R.id.water_bar, 100, 0, false);
            return;
        }
        int water = summary.optInt("waterMl", 0);
        int goal = summary.optInt("waterGoalMl", 0);
        views.setTextViewText(R.id.water_amount, water + " ml");
        views.setTextViewText(R.id.water_goal, goal > 0 ? "of " + goal + " ml" : "today");
        views.setProgressBar(R.id.water_bar, 100, percent(water, goal), false);
    }
}
