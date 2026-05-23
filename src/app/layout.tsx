import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/notifications/styles.css";

import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import type { Metadata } from "next";

import { theme } from "@/lib/theme";
import { QueryProvider } from "@/components/query-provider";

export const metadata: Metadata = {
  title: "Form Admin",
  description: "Form Builder Admin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="light">
          <QueryProvider>
            <Notifications />
            <ModalsProvider>{children}</ModalsProvider>
          </QueryProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
