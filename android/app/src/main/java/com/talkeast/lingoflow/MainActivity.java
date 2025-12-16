package com.talkeast.lingoflow;

import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.Bridge;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable hardware acceleration for better performance
        getWindow().setFlags(
            android.view.WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            android.view.WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
    }
    
    @Override
    public void onStart() {
        super.onStart();
        // Ensure WebView loads from bundled assets, not localhost
        ensureBundledAssets();
        // Configure WebView if not already configured
        if (this.bridge != null && this.bridge.getWebView() != null) {
            configureWebView(this.bridge.getWebView());
        }
    }
    
    /**
     * Ensure the app loads from bundled assets, not from localhost
     */
    private void ensureBundledAssets() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            String currentUrl = webView.getUrl();
            
            // If trying to load from localhost, force load from assets
            if (currentUrl != null && (currentUrl.contains("localhost") || currentUrl.contains("127.0.0.1"))) {
                webView.loadUrl("file:///android_asset/public/index.html");
            } else if (currentUrl == null || currentUrl.isEmpty()) {
                // If no URL is set, load from assets
                webView.loadUrl("file:///android_asset/public/index.html");
            }
        }
    }
    
    
    @Override
    public void onResume() {
        super.onResume();
        // Resume WebView
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().onResume();
        }
    }
    
    @Override
    public void onPause() {
        super.onPause();
        // Pause WebView
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().onPause();
        }
    }
    
    @Override
    public void onStop() {
        super.onStop();
        // Stop app state
    }
    
    @Override
    public void onDestroy() {
        // Cleanup WebView
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().destroy();
        }
        super.onDestroy();
    }
    
    @Override
    public void onBackPressed() {
        // Handle back button press
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            if (webView.canGoBack()) {
                webView.goBack();
            } else {
                super.onBackPressed();
            }
        } else {
            super.onBackPressed();
        }
    }
    
    /**
     * Configure WebView with all necessary settings for full functionality
     */
    private void configureWebView(WebView webView) {
        if (webView == null) return;
        
        WebSettings settings = webView.getSettings();
        
        // Enable JavaScript (CRITICAL for React apps)
        settings.setJavaScriptEnabled(true);
        
        // Enable DOM Storage (for localStorage, IndexedDB)
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        
        // Enable file access
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        
        // Media and audio support
        settings.setMediaPlaybackRequiresUserGesture(false); // Allow autoplay
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // Cache and performance
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        
        // Enable hardware acceleration
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
        
        // Enable zoom controls
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        
        // Text rendering
        settings.setDefaultTextEncodingName("UTF-8");
        settings.setLoadsImagesAutomatically(true);
        settings.setBlockNetworkImage(false);
        settings.setBlockNetworkLoads(false);
        
        // User agent
        settings.setUserAgentString(settings.getUserAgentString() + " TalkEastApp");
        
        // Set WebChromeClient for media support (audio, video, file uploads)
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(android.webkit.PermissionRequest request) {
                // Grant all permissions for audio, video, etc.
                request.grant(request.getResources());
            }
            
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                // Allow geolocation if needed
                callback.invoke(origin, true, false);
            }
        });
        
        // Set WebViewClient for proper navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                String url = request.getUrl().toString();
                
                // Block localhost URLs and redirect to bundled assets
                if (url != null && (url.contains("localhost") || url.contains("127.0.0.1") || url.startsWith("https://localhost") || url.startsWith("http://localhost"))) {
                    android.util.Log.w("TalkEast", "Blocked localhost URL: " + url + ", loading from bundled assets instead");
                    view.loadUrl("file:///android_asset/public/index.html");
                    return true;
                }
                
                // Let WebView handle all other URLs
                return false;
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                
                // If page finished loading but URL is still localhost, redirect
                if (url != null && (url.contains("localhost") || url.contains("127.0.0.1"))) {
                    android.util.Log.w("TalkEast", "Page finished with localhost URL, redirecting to bundled assets");
                    view.loadUrl("file:///android_asset/public/index.html");
                }
            }
            
            @Override
            public void onReceivedError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceError error) {
                super.onReceivedError(view, request, error);
                
                String url = request.getUrl().toString();
                android.util.Log.e("TalkEast", "WebView error for URL: " + url + " - " + error.getDescription());
                
                // If error is for localhost, redirect to bundled assets
                if (url != null && (url.contains("localhost") || url.contains("127.0.0.1"))) {
                    android.util.Log.w("TalkEast", "Redirecting from localhost error to bundled assets");
                    view.loadUrl("file:///android_asset/public/index.html");
                }
            }
        });
    }
}
