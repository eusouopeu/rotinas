package com.pedro.rotinas;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ShortcutsPlugin.class);
        registerPlugin(TimerOverlayPlugin.class);
        registerPlugin(WidgetsPlugin.class);
        registerPlugin(DriveSyncPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
