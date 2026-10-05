import Script from "next/script";

/** GA4, loaded after the page is interactive. Only rendered when a measurement ID is set in Admin → SEO. */
export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  if (!/^G-[A-Z0-9]{4,}$/.test(measurementId)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}
