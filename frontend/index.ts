import { registerRootComponent } from 'expo';

import App from './App';
import DesignSystemPreview from './src/design/DesignSystemPreview';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// EXPO_PUBLIC_SCREEN=design-system membuka halaman uji design system (hanya untuk pengembangan).
registerRootComponent(
  process.env.EXPO_PUBLIC_SCREEN === 'design-system' ? DesignSystemPreview : App,
);
