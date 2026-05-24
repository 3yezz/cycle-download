package com.ed.cycle;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.splashscreen.SplashScreen;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private View loadingLayout;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        loadingLayout = findViewById(R.id.loadingLayout);
        webView = findViewById(R.id.webview);

        loadingLayout.setVisibility(View.VISIBLE);
        webView.setVisibility(View.INVISIBLE);

        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }

        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.addJavascriptInterface(new WebAppInterface(), "EDcycle");
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setWebChromeClient(new WebChromeClient());

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if ("appassets.androidplatform.net".equals(host) || (host != null && host.endsWith("e-d.fr"))) {
                    return false;
                }

                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) {}
                return true;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                loadingLayout.animate().alpha(0).setDuration(250).withEndAction(() -> {
                    webView.setVisibility(View.VISIBLE);
                    loadingLayout.setVisibility(View.GONE);
                });
            }
        });

        webView.post(() -> {
            if (savedInstanceState != null) {
                webView.restoreState(savedInstanceState);
            } else {
                webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView != null) {
                    webView.evaluateJavascript("if(window.goBack){ goBack(); }", null);
                }
            }
        });

        PillReminderReceiver.createChannel(this);
    }

    @Override
    protected void onResume() {
        super.onResume();
        SharedPreferences prefs = getSharedPreferences(PillActionReceiver.PREFS_ACTIONS, MODE_PRIVATE);
        String pending = prefs.getString(PillActionReceiver.KEY_PENDING, "");
        if (!pending.isEmpty()) {
            prefs.edit().remove(PillActionReceiver.KEY_PENDING).apply();
            String safeJson = pending.replace("\\", "\\\\").replace("'", "\\'");
            String js = "window.applyPillAction && window.applyPillAction('" + safeJson + "')";
            if (webView != null) webView.post(() -> webView.evaluateJavascript(js, null));
        }
    }

    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    public class WebAppInterface {
        @JavascriptInterface
        public void openUrl(String url) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void scheduleReminder(String timeStr) {
            try {
                String[] parts = timeStr.split(":");
                int hour = Integer.parseInt(parts[0]);
                int minute = Integer.parseInt(parts[1]);

                SharedPreferences prefs = getSharedPreferences(BootReceiver.PREFS_CONFIG, MODE_PRIVATE);
                prefs.edit().putInt("hour", hour).putInt("minute", minute)
                        .putBoolean("enabled", true).apply();

                PillReminderReceiver.schedule(MainActivity.this, hour, minute);

                if (Build.VERSION.SDK_INT >= 33) {
                    if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                            != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(
                                new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 200);
                    }
                }
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void cancelReminder() {
            SharedPreferences prefs = getSharedPreferences(BootReceiver.PREFS_CONFIG, MODE_PRIVATE);
            prefs.edit().putBoolean("enabled", false).apply();
            PillReminderReceiver.cancel(MainActivity.this);
        }

        @JavascriptInterface
        public String getPendingPillActions() {
            SharedPreferences prefs = getSharedPreferences(PillActionReceiver.PREFS_ACTIONS, MODE_PRIVATE);
            return prefs.getString(PillActionReceiver.KEY_PENDING, "");
        }

        @JavascriptInterface
        public void clearPendingPillActions() {
            SharedPreferences prefs = getSharedPreferences(PillActionReceiver.PREFS_ACTIONS, MODE_PRIVATE);
            prefs.edit().remove(PillActionReceiver.KEY_PENDING).apply();
        }
    }
}
