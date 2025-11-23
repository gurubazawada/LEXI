'use client';

import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Bank, Home, User, ChatBubble } from 'iconoir-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * This component uses the UI Kit to navigate between pages
 * Bottom navigation is the most common navigation pattern in Mini Apps
 * We require mobile first design patterns for mini apps
 * Read More: https://docs.world.org/mini-apps/design/app-guidelines#mobile-first
 */

export const Navigation = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState('home');

  // Update tab value based on current pathname
  useEffect(() => {
    if (pathname === '/home') {
      setValue('home');
    } else if (pathname === '/lessons') {
      setValue('lessons');
    } else if (pathname === '/match') {
      setValue('match');
    }
  }, [pathname]);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    if (newValue === 'home') {
      router.push('/home');
    } else if (newValue === 'lessons') {
      router.push('/lessons');
    } else if (newValue === 'match') {
      router.push('/match');
    }
  };

  return (
    <Tabs value={value} onValueChange={handleValueChange}>
      <TabItem value="home" icon={<Home />} label="Home" />
      <TabItem value="match" icon={<ChatBubble />} label="Match" />
      <TabItem value="lessons" icon={<ChatBubble />} label="Lessons" />
    </Tabs>
  );
};
