package com.glorymukami.tracker;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Set by a home-screen widget: which journal page the tap wants. */
    static final String EXTRA_OPEN_VIEW = "openView";

    /**
     * The page a widget asked for, until the web layer collects it. Static
     * because the plugin that hands it over is not tied to this activity
     * instance, and because a widget tap may arrive before the web layer is
     * ready to ask.
     */
    private static String pendingView;

    static synchronized String takePendingView() {
        String view = pendingView;
        pendingView = null;
        return view;
    }

    private static synchronized void remember(String view) {
        pendingView = view;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registered before the bridge starts, so the web layer can find it.
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);
        readWidgetRequest(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        readWidgetRequest(intent);
    }

    private void readWidgetRequest(Intent intent) {
        if (intent == null) return;
        String view = intent.getStringExtra(EXTRA_OPEN_VIEW);
        if (view != null && !view.isEmpty()) {
            remember(view);
            // So a later recreation of the activity does not replay the tap.
            intent.removeExtra(EXTRA_OPEN_VIEW);
        }
    }
}
