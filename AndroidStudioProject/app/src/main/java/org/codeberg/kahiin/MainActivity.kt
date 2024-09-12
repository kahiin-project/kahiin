package org.codeberg.kahiin

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

//        val commands = """
//            cd ~
//            rm -r kahiin
//            pkg install git
//            git clone https://codeberg.org/tristan-gscn/kahiin.git
//            cd kahiin
//            ./start.sh
//        """.trimIndent()
        val commands = "ls"

        val intent = Intent("com.termux.api.RUN_COMMAND").apply {
            putExtra("command", commands)
        }

        Log.d("MainActivity", "Intent created: $intent")

        try {
            startActivity(intent)
            Log.d("MainActivity", "Intent started successfully")
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to start intent", e)
        }
    }
}
