package com.pedro.rotinas;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ShortcutsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
