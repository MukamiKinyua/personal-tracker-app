package com.glorymukami.tracker;

import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** The next few dated things: assignments, documents, reminders. */
public class UpcomingWidget extends BaseTrackerWidget {

    private static final int[] LABELS = {
        R.id.upcoming_label_1, R.id.upcoming_label_2, R.id.upcoming_label_3
    };
    private static final int[] WHENS = {
        R.id.upcoming_when_1, R.id.upcoming_when_2, R.id.upcoming_when_3
    };

    @Override
    protected int layoutId() {
        return R.layout.widget_upcoming;
    }

    @Override
    protected int rootId() {
        return R.id.upcoming_root;
    }

    @Override
    protected String target() {
        return "assignments";
    }

    @Override
    protected void bind(Context context, RemoteViews views, JSONObject summary) {
        JSONArray items = array(summary, "upcoming");

        if (summary == null) {
            line(views, R.id.upcoming_empty, "Open the app once to start");
        } else if (items.length() == 0) {
            line(views, R.id.upcoming_empty, "Nothing coming up");
        } else {
            line(views, R.id.upcoming_empty, "");
        }

        for (int i = 0; i < LABELS.length; i++) {
            JSONObject item = i < items.length() ? items.optJSONObject(i) : null;
            line(views, LABELS[i], item == null ? "" : item.optString("label", ""));
            line(views, WHENS[i], item == null ? "" : item.optString("when", ""));
        }
    }
}
