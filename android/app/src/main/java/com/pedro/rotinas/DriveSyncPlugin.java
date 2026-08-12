package com.pedro.rotinas;

import android.content.Context;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

/**
 * Ponte JS ↔ SyncEngine (sync com Google Drive). Mesma forma que
 * window.electronBridge.sync tem no desktop — a tela de Configurações →
 * Backup usa os dois através do mesmo adaptador JS (syncBridge() no
 * index.html), então esta classe só traduz JSONObject/JSONArray para
 * JSObject/JSArray do Capacitor.
 *
 * Todo método faz rede/disco, então roda numa thread própria — nunca na
 * thread principal (ANR). PluginCall.resolve()/reject() são seguros de
 * chamar de qualquer thread.
 */
@CapacitorPlugin(name = "DriveSync")
public class DriveSyncPlugin extends Plugin {

    private static JSObject toJSObject(JSONObject o) throws Exception {
        return new JSObject(o.toString());
    }

    @PluginMethod
    public void connect(PluginCall call) {
        Context ctx = getContext();
        new Thread(() -> {
            try {
                SyncEngine.connect(ctx);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() == null ? e.toString() : e.getMessage(), e);
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        Context ctx = getContext();
        new Thread(() -> {
            SyncEngine.disconnect(ctx);
            call.resolve();
        }).start();
    }

    @PluginMethod
    public void syncNow(PluginCall call) {
        Context ctx = getContext();
        new Thread(() -> {
            try {
                JSONObject result = SyncEngine.syncOnce(ctx);
                call.resolve(toJSObject(result));
            } catch (Exception e) {
                call.reject(e.getMessage() == null ? e.toString() : e.getMessage(), e);
            }
        }).start();
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        Context ctx = getContext();
        new Thread(() -> {
            try {
                call.resolve(toJSObject(SyncEngine.getStatus(ctx)));
            } catch (Exception e) {
                call.reject(e.getMessage() == null ? e.toString() : e.getMessage(), e);
            }
        }).start();
    }

    @PluginMethod
    public void resolveConflict(PluginCall call) {
        Context ctx = getContext();
        String key = call.getString("key");
        String choice = call.getString("choice");
        new Thread(() -> {
            try {
                SyncEngine.resolveConflict(ctx, key, choice);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() == null ? e.toString() : e.getMessage(), e);
            }
        }).start();
    }
}
