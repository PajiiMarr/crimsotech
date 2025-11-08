import type { Route } from './+types/about';
import { Header } from '~/components/client/header';
import { HeroParallax } from '~/components/ui/hero-parallax';


export default function About(){
    return (
        <div className="min-h-svh flex flex-col">
            <Header />
        </div>
    )
}

