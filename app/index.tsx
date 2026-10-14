import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { hasAcceptedConsent } from '../lib/consent';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    hasAcceptedConsent()
      .then((value) => {
        setAccepted(value);
        setReady(true);
      })
      .catch(() => {
        setAccepted(false);
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  return <Redirect href={accepted ? '/login' : '/consent'} />;
}
