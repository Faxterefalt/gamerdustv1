import type { PropsWithChildren } from 'react';
import Footer from './components/Footer';
import Header from './components/Header';

export default function SiteLayout({ children }: PropsWithChildren) {
    return (
        <>
            <Header />
            <main>{children}</main>
            <Footer />
        </>
    );
}
