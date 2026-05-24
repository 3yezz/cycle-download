package com.ed.cycle;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.app.NotificationCompat;

import java.util.Calendar;

public class PillReminderReceiver extends BroadcastReceiver {

    static final String CHANNEL_ID = "pill_reminder";
    static final int NOTIF_ID = 1001;

    @Override
    public void onReceive(Context context, Intent intent) {
        int hour = intent.getIntExtra("hour", 8);
        int minute = intent.getIntExtra("minute", 0);

        createChannel(context);
        showNotification(context);
        scheduleNext(context, hour, minute);
    }

    static void createChannel(Context context) {
        NotificationManager nm = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "Rappel pilule", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Rappel de prise de traitement quotidien");
        nm.createNotificationChannel(ch);
    }

    static void showNotification(Context context) {
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPi = PendingIntent.getActivity(context, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent takenIntent = new Intent(context, PillActionReceiver.class);
        takenIntent.setAction("com.ed.cycle.PILL_TAKEN");
        PendingIntent takenPi = PendingIntent.getBroadcast(context, 1, takenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Intent skippedIntent = new Intent(context, PillActionReceiver.class);
        skippedIntent.setAction("com.ed.cycle.PILL_SKIPPED");
        PendingIntent skippedPi = PendingIntent.getBroadcast(context, 2, skippedIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("Rappel traitement")
                .setContentText("As-tu pris ta pilule aujourd'hui ?")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(openPi)
                .setAutoCancel(true)
                .addAction(0, "✓ Pris", takenPi)
                .addAction(0, "✗ Non pris", skippedPi);

        NotificationManager nm = (NotificationManager)
                context.getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(NOTIF_ID, builder.build());
    }

    static void schedule(Context context, int hour, int minute) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, PillReminderReceiver.class);
        intent.putExtra("hour", hour);
        intent.putExtra("minute", minute);
        PendingIntent pi = PendingIntent.getBroadcast(context, 100, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, hour);
        cal.set(Calendar.MINUTE, minute);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        if (cal.getTimeInMillis() <= System.currentTimeMillis()) {
            cal.add(Calendar.DAY_OF_YEAR, 1);
        }

        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cal.getTimeInMillis(), pi);
    }

    static void cancel(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, PillReminderReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(context, 100, intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE);
        if (pi != null) am.cancel(pi);
    }

    private static void scheduleNext(Context context, int hour, int minute) {
        schedule(context, hour, minute);
    }
}
