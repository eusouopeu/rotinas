package com.pedro.rotinas;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.ListView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.List;

/**
 * Escolha da rotina ao adicionar o widget. Lê as rotinas do JSON gravado pelo
 * app (RoutineStore) — não precisa subir o WebView.
 */
public class RoutineWidgetConfigActivity extends Activity {

    private int widgetId = AppWidgetManager.INVALID_APPWIDGET_ID;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // se o usuário desistir (voltar), o widget não deve ser criado
        setResult(RESULT_CANCELED);
        setContentView(R.layout.widget_config);

        Bundle extras = getIntent().getExtras();
        if (extras != null) {
            widgetId = extras.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
        }
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return; }

        final List<RoutineStore.Routine> routines = RoutineStore.all(this);
        ListView list = findViewById(R.id.cfgList);
        TextView empty = findViewById(R.id.cfgEmpty);

        if (routines.isEmpty()) {
            empty.setVisibility(View.VISIBLE);
            list.setVisibility(View.GONE);
            return;
        }

        List<String> labels = new ArrayList<>();
        for (RoutineStore.Routine r : routines) labels.add(r.name);

        list.setAdapter(new ArrayAdapter<>(this, R.layout.widget_config_row, labels));
        list.setOnItemClickListener((parent, view, position, id) -> {
            RoutineStore.Routine chosen = routines.get(position);
            RoutineWidgetProvider.saveRoutineId(this, widgetId, chosen.id);
            RoutineWidgetProvider.render(this, AppWidgetManager.getInstance(this), widgetId);

            Intent result = new Intent();
            result.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
            setResult(RESULT_OK, result);
            finish();
        });
    }
}
