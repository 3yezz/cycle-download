package com.ed.cycle;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

public class BootReceiver extends BroadcastReceiver {

    static final String PREFS_CONFIG = "pill_reminder_config";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_CONFIG, Context.MODE_PRIVATE);
        if (!prefs.getBoolean("enabled", false)) return;
        int hour = prefs.getInt("hour", 8);
        int minute = prefs.getInt("minute", 0);
        PillReminderReceiver.createChannel(context);
        PillReminderReceiver.schedule(context, hour, minute);
    }
}
