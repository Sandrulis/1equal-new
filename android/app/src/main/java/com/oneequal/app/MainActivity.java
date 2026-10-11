package com.oneequal.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final long MIN_VISIBLE_MS = 700;
    private View launchScreen;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private long shownAt;
    private int readyTicks;
    private boolean hideRequested;
    private boolean hiding;

    private final Runnable watchPage = new Runnable() {
        @Override
        public void run() {
            if (launchScreen == null || launchScreen.getVisibility() != View.VISIBLE) return;
            WebView webView = bridge.getWebView();
            String url = webView == null ? null : webView.getUrl();
            if (url != null && (url.startsWith("https://www.1equal.com") || url.startsWith("https://1equal.com"))) readyTicks++;
            else readyTicks = 0;
            if (readyTicks >= 2) {
                hideLaunchScreen();
                return;
            }
            handler.postDelayed(this, 150);
        }
    };

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        launchScreen = getLayoutInflater().inflate(R.layout.launch_screen, null);
        addContentView(
            launchScreen,
            new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        );
        shownAt = SystemClock.uptimeMillis();
        handler.post(watchPage);
        loadBrand();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(watchPage);
        super.onDestroy();
    }

    private void hideLaunchScreen() {
        if (launchScreen == null || launchScreen.getVisibility() != View.VISIBLE || hiding) return;
        long wait = MIN_VISIBLE_MS - (SystemClock.uptimeMillis() - shownAt);
        if (wait > 0) {
            if (!hideRequested) {
                hideRequested = true;
                handler.postDelayed(this::hideLaunchScreen, wait);
            }
            return;
        }
        hiding = true;
        launchScreen.animate().alpha(0f).setDuration(180).withEndAction(() -> launchScreen.setVisibility(View.GONE));
    }

    private void loadBrand() {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL("https://www.1equal.com/api/brand").openConnection();
                connection.setConnectTimeout(4000);
                connection.setReadTimeout(4000);
                connection.setRequestProperty("Accept", "application/json");
                if (connection.getResponseCode() != 200) return;
                JSONObject json = new JSONObject(readText(connection.getInputStream()));
                String name = json.optString("name", "").trim();
                String logoUrl = json.optString("logoUrl", "").trim();
                Bitmap logo = logoUrl.startsWith("https://") ? loadLogo(logoUrl) : null;
                runOnUiThread(() -> showBrand(name, logo));
            } catch (Exception ignored) {
                // The launch screen keeps the app name.
            } finally {
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    private Bitmap loadLogo(String logoUrl) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(logoUrl).openConnection();
            connection.setConnectTimeout(4000);
            connection.setReadTimeout(4000);
            connection.setInstanceFollowRedirects(true);
            if (connection.getResponseCode() != 200) return null;
            try (InputStream stream = connection.getInputStream()) {
                return BitmapFactory.decodeStream(stream);
            }
        } catch (Exception ignored) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private void showBrand(String name, Bitmap logo) {
        if (launchScreen == null) return;
        ImageView image = launchScreen.findViewById(R.id.launch_logo);
        TextView title = launchScreen.findViewById(R.id.launch_name);
        if (logo != null) {
            image.setImageBitmap(logo);
            image.setVisibility(View.VISIBLE);
            title.setVisibility(View.GONE);
            return;
        }
        if (!name.isEmpty()) title.setText(name);
    }

    private static String readText(InputStream stream) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int read;
        while ((read = stream.read(buffer)) != -1) output.write(buffer, 0, read);
        stream.close();
        return output.toString(StandardCharsets.UTF_8);
    }
}
