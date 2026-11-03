package store.bitdoin.app;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Tapping a push notification while the app is closed starts the app with the notification's data in the
        // launch intent. The push plugin only reads it in onNewIntent (taps while the app runs), so hand it over once.
        Intent launch = getIntent();
        if (savedInstanceState == null && launch != null && launch.getExtras() != null
            && launch.getExtras().containsKey("google.message_id")) {
            onNewIntent(launch);
        }
    }
}
