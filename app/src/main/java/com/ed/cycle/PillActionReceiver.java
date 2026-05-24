package com.ed.cycle;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class PillActionReceiver extends BroadcastReceiver {

    static final String PREFS_ACTIONS = "pill_actions";
    static final String KEY_PENDING = "pending_action";

    @Override
    public void onReceive(Context context, Intent intent) {
        boolean taken = "com.ed.cycle.PILL_TAKEN".equals(intent.getAction());

        String date = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        String time = new SimpleDateFormat("HH:mm", Locale.US).format(new Date());

        String takenAt = taken ? time : "";
        String json = "{\"date\":\"" + date + "\",\"taken\":" + taken
                + ",\"takenAt\":\"" + takenAt + "\"}";

        SharedPreferences prefs = context.getSharedPreferences(PREFS_ACTIONS, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_PENDING, json).apply();

        NotificationManager nm = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.cancel(PillReminderReceiver.NOTIF_ID);
    }
}
