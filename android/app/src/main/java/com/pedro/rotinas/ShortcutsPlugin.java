package com.pedro.rotinas;

import android.content.Context;
import android.content.Intent;

import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Atalhos dinâmicos do launcher (manter o ícone do app pressionado).
 * set({shortcuts:[{id,label}]}) publica até 4 atalhos "iniciar rotina";
 * o toque num atalho entrega o extra britaStartRoutine ao JS via
 * getLaunch() (cold start) ou o evento "shortcut" (app já aberto).
 */
@CapacitorPlugin(name = "Shortcuts")
public class ShortcutsPlugin extends Plugin {

    private static final String EXTRA_ID = "britaStartRoutine";

    @PluginMethod
    public void set(PluginCall call) {
        try {
            JSArray arr = call.getArray("shortcuts");
            Context ctx = getContext();
            List<ShortcutInfoCompat> list = new ArrayList<>();
            int max = Math.min(arr.length(), 4);
            for (int i = 0; i < max; i++) {
                JSONObject o = arr.getJSONObject(i);
                String id = o.getString("id");
                String label = o.getString("label");
                if (label.isEmpty()) continue;
                Intent intent = new Intent(ctx, MainActivity.class);
                intent.setAction(Intent.ACTION_MAIN);
                intent.putExtra(EXTRA_ID, id);
                list.add(new ShortcutInfoCompat.Builder(ctx, id)
                        .setShortLabel(label)
                        .setIcon(IconCompat.createWithResource(ctx, R.mipmap.ic_launcher))
                        .setIntent(intent)
                        .build());
            }
            ShortcutManagerCompat.setDynamicShortcuts(ctx, list);
            // set() é chamado sempre que as rotinas mudam, então é o gancho
            // natural para redesenhar os widgets com nomes/durações novos
            RoutineWidgetProvider.refreshAll(ctx);
            call.resolve();
        } catch (Exception e) {
            call.reject("Falha ao publicar atalhos: " + e.getMessage());
        }
    }

    /** Consome (e limpa) o id de rotina do intent que abriu o app, se houver. */
    @PluginMethod
    public void getLaunch(PluginCall call) {
        JSObject ret = new JSObject();
        Intent intent = getActivity() != null ? getActivity().getIntent() : null;
        String id = intent != null ? intent.getStringExtra(EXTRA_ID) : null;
        ret.put("routineId", id == null ? "" : id);
        if (intent != null) intent.removeExtra(EXTRA_ID);
        call.resolve(ret);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String id = intent.getStringExtra(EXTRA_ID);
        if (id != null) {
            JSObject data = new JSObject();
            data.put("routineId", id);
            notifyListeners("shortcut", data);
            intent.removeExtra(EXTRA_ID);
        }
    }
}
