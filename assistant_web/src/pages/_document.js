import { Html, Head, Main, NextScript } from "next/document";
import { ColorModeScript } from "@chakra-ui/react";
import theme from "@/theme";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#000000" />
        <meta name="description" content="GridWork -- one workspace for wherever work happens, from local to remote" />
        <meta name="keyword" content="GridWork, productivity, workspace, remote work" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        {/* Sets the color-mode cookie/localStorage value before hydration
            so there's no flash of the wrong theme on first paint --
            same purpose CRA's ColorModeScript served in index.js, just
            rendered here instead since Pages Router hydrates from this
            static document shell. */}
        <ColorModeScript initialColorMode={theme.config?.initialColorMode} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
