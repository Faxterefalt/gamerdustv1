import type { PropsWithChildren } from 'react';
import Footer from './Footer';
import Header from './Header';

export default function SiteLayout({ children }: PropsWithChildren) {
    return (
        <>
            <Header />
            <main>{children}</main>
            <Footer />
        </>
    );
}
