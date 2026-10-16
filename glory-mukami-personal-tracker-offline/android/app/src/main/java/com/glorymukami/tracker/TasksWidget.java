package com.glorymukami.tracker;

import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

/** The next few open tasks. Titles only when the app says they may be shown. */
public class TasksWidget extends BaseTrackerWidget {

    private static final int[] ROWS = {
        R.id.tasks_row_1, R.id.tasks_row_2, R.id.tasks_row_3, R.id.tasks_row_4
    };

    @Override
    protected int layoutId() {
        return R.layout.widget_tasks;
    }

    @Override
    protected int rootId() {
        return R.id.tasks_root;
    }

    @Override
    protected String target() {
        return "tasks";
    }

    @Override
    protected void bind(Context context, RemoteViews views, JSONObject summary) {
        if (summary == null) {
            views.setTextViewText(R.id.tasks_count, "Open the app once to start");
            for (int row : ROWS) line(views, row, "");
            return;
        }

        int open = summary.optInt("tasksOpen", 0);
        boolean hidden = summary.optBoolean("hidden", false);
        views.setTextViewText(
            R.id.tasks_count,
            open == 0 ? "Nothing open" : open + (open == 1 ? " task open" : " tasks open")
        );

        JSONArray tasks = array(summary, "tasks");
        for (int i = 0; i < ROWS.length; i++) {
            String title = i < tasks.length() ? tasks.optString(i, "") : "";
            line(views, ROWS[i], title.isEmpty() ? "" : "•  " + title);
        }
        if (hidden && open > 0) {
            line(views, ROWS[0], "Details hidden in privacy mode");
        }
    }
}
