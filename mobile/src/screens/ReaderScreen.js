import { useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { fileUrl } from '../api';

function getExtension(fileName = '') {
  const match = fileName.match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : '';
}

export default function ReaderScreen({ route }) {
  const { book } = route.params;
  const ext = getExtension(book.file_name);
  const [error, setError] = useState(null);

  if (ext === 'epub') {
    // No Expo-compatible EPUB renderer is wired up yet (most options need a
    // custom WebView + epub.js bridge or a bare/dev-client native module).
    // Follow-up: integrate an EPUB reader once one is chosen.
    return (
      <View style={styles.center}>
        <Text style={styles.unsupportedTitle}>EPUB preview isn't available yet</Text>
        <Text style={styles.unsupportedDetail}>
          This is a follow-up item. For now you can open the file externally.
        </Text>
        <TouchableOpacity
          style={styles.openButton}
          onPress={() => Linking.openURL(fileUrl(book.id))}
        >
          <Text style={styles.openButtonText}>Open in browser</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.unsupportedTitle}>Couldn't open this book</Text>
        <Text style={styles.unsupportedDetail}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pdf
        source={{ uri: fileUrl(book.id), cache: true }}
        style={styles.pdf}
        onError={(err) => setError(String(err?.message || err))}
        renderActivityIndicator={() => <ActivityIndicator size="large" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#525659' },
  pdf: { flex: 1, width: '100%', height: '100%' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  unsupportedTitle: { fontSize: 17, fontWeight: '600', color: '#111', marginBottom: 6, textAlign: 'center' },
  unsupportedDetail: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 18 },
  openButton: { backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 22, borderRadius: 6 },
  openButtonText: { color: '#fff', fontWeight: '600' },
});
