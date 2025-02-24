import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel={"stylesheet"} href={"../../../fonts/fonts.css"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/Windows.ttf"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/nohemi/Nohemi Regular.woff"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/nohemi/Nohemi Black.woff"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/nohemi/Nohemi Bold.woff"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/nohemi/Nohemi ExtraBold.woff"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/nohemi/Nohemi ExtraLight.woff"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/nohemi/Nohemi Light.woff"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/nohemi/Nohemi Regular.woff"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/nohemi/Nohemi SemiBold.woff"}/>
                <link rel={"preload"} as={"font"} href={"../../../fonts/nohemi/Nohemi Thin.woff"}/>
                <link rel="preconnect" href="https://fonts.googleapis.com"/>
                <link rel="preconnect" href="https://fonts.gstatic.com"/>
                <link
                    href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=dm_sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
                    rel="stylesheet"/>
            </Head>
            <body>
            <Main/>
            <NextScript/>
            </body>
        </Html>
    );
}
