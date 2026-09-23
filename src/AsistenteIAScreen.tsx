// frontend/src/AsistenteIAScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Colors } from '../colors';

export default function AsistenteIAScreen() {
  const [mensajes, setMensajes] = useState<Array<{ sender: string; text: string }>>([
    { sender: 'bot', text: '¡Hola! Soy el asistente IA de la Maratón Mijovi. ¿En qué te puedo ayudar?' }
  ]);
  const [input, setInput] = useState('');

  const enviarConsulta = () => {
    if (!input.trim()) return;
    
    // Lógica local o llamada al agente Edge
    const userMsg = input;
    setMensajes(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
  };

  return (
    <View style={{ flex: 1, padding: 15, backgroundColor: Colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        {mensajes.map((m, index) => (
          <View key={index} style={[styles.msgBox, m.sender === 'user' ? styles.msgUser : styles.msgBot]}>
            <Text style={{ color: Colors.white }}>{m.text}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        <TextInput 
          style={styles.chatInput} 
          placeholder="Pregunta algo sobre la maratón..." 
          placeholderTextColor="#888"
          value={input} 
          onChangeText={setInput} 
        />
        <TouchableOpacity style={styles.btnSend} onPress={enviarConsulta}>
          <Text style={{ color: Colors.white, fontWeight: 'bold' }}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  msgBox: { padding: 12, borderRadius: 10, marginVertical: 4, maxWidth: '80%' },
  msgUser: { backgroundColor: Colors.primary, alignSelf: 'flex-end' },
  msgBot: { backgroundColor: '#333', alignSelf: 'flex-start' },
  chatInput: { flex: 1, backgroundColor: '#FFF', color: '#000', borderRadius: 8, paddingHorizontal: 12 },
  btnSend: { backgroundColor: Colors.primary, padding: 12, borderRadius: 8, marginLeft: 6 }
});