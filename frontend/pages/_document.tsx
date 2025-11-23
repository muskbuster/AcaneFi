import { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" className="dark" suppressHydrationWarning>
      <Head />
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx: DocumentContext): Promise<DocumentInitialProps> => {
  const initialProps = await ctx.renderPage();
  return { ...initialProps };
};

