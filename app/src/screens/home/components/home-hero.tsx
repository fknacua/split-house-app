import { Text, View } from 'react-native';

import type { HomeHeroProps } from '../types';
import { HomeNotice } from './home-notice';
import { HomeSteps } from './home-steps';
import { HomeTile } from './home-tile';

/**
 * The card at the top of Home: the date line, the month's three steps and the body for the
 * month's status. Every string comes from `GET /api/home`.
 */
export function HomeHero({ hero }: HomeHeroProps) {
  const { body } = hero;

  return (
    <View className="gap-3.5 rounded-card bg-selected px-4.5 pb-4 pt-4.5">
      <View className="gap-2.5">
        <Text className="font-manrope-semibold text-caption text-on-selected opacity-85">
          {hero.dateLine}
        </Text>
        <HomeSteps steps={hero.steps} />
      </View>
      {body.kind === 'waiting' || body.kind === 'unsent' ? (
        <>
          <View className="gap-1.5">
            <Text
              accessibilityRole="header"
              className="font-manrope-extrabold text-title tracking-[-0.4px] text-on-selected"
            >
              {body.title}
            </Text>
            <Text className="font-manrope-medium text-body text-on-selected opacity-90">
              {body.text}
            </Text>
          </View>
          <View className="flex-row gap-2.5">
            {body.tiles.map((tile) => (
              <HomeTile key={tile.label} label={tile.label} value={tile.value} />
            ))}
          </View>
        </>
      ) : null}
      {hero.notice ? <HomeNotice notice={hero.notice} /> : null}
    </View>
  );
}
