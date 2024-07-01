import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>Graph Comic</title>
        <meta name="description" content="description" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/es6-promise/4.1.1/es6-promise.auto.js"></script>
      </Head>
      <body oncontextmenu="return false" ondragstart="return false" onselectstart="return false">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
