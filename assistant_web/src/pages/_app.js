import { Provider } from 'react-redux';
import { ChakraProvider } from '@chakra-ui/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import store from '@/store';
// This is the theme App.js actually wraps the CRA app in via its own
// nested ChakraProvider (theme={theme} from './theme') -- the real,
// dark-mode-aware one (styles.global is a function of props.colorMode,
// plus the compact-density component defaults). ui_theme.js is the
// CRA app's OTHER theme, wired only to index.js's outer ChakraProvider,
// which App.js's inner one shadows for the entire app -- so ui_theme.js
// never actually applies to anything in the real CRA build either.
import theme from '@/theme';
import '@/components/dashboard/editor/RichTextEditor.css';

export default function App({ Component, pageProps }) {
  return (
    <GoogleOAuthProvider clientId="652739503522-plue7m9vj1rkbj9rta67fiqpe3lobpqg.apps.googleusercontent.com">
      <Provider store={store}>
        <ChakraProvider theme={theme}>
          <Component {...pageProps} />
        </ChakraProvider>
      </Provider>
    </GoogleOAuthProvider>
  );
}
