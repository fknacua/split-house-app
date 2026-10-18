import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { AlertTriangle, ChevronDown } from 'lucide-react-native';

import {
  Accordion,
  AccordionContent,
  AccordionContentText,
  AccordionHeader,
  AccordionIcon,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertIcon, AlertText } from '@/components/ui/alert';
import { Badge, BadgeText } from '@/components/ui/badge';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import { AddChargeSheet } from './add-charge-sheet';

// Fictional sample data, same roles/amounts as the Nov 2026 fixtures
// in the Data Model doc (never real names in code — public-repo hygiene).
const people = [
  {
    name: 'Priya',
    role: 'Primary tenant',
    totalCents: 186286,
    paid: true,
    lines: [
      { label: 'Rent', cents: 167500 },
      { label: 'Utilities', cents: 12369 },
      { label: 'Aircon', cents: 3667 },
      { label: 'Starhub', cents: 2750 },
    ],
  },
  {
    name: 'Sam',
    role: 'Tenant 1',
    totalCents: 95000 + 10079,
    paid: false,
    lines: [
      { label: 'Rent (direct)', cents: 95000 },
      { label: 'Utilities (via Priya)', cents: 8246 },
      { label: 'Aircon (via Priya)', cents: 1833 },
    ],
  },
  {
    name: 'Jordan',
    role: 'Tenant 2',
    totalCents: 95000 + 10079,
    paid: false,
    lines: [
      { label: 'Rent', cents: 95000 },
      { label: 'Utilities', cents: 8246 },
      { label: 'Aircon', cents: 1833 },
    ],
  },
];

const collectedCents = people.filter((p) => p.paid).reduce((sum, p) => sum + p.totalCents, 0);
const totalCents = people.reduce((sum, p) => sum + p.totalCents, 0);

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function Home() {
  // Not real loading state — just enough to exercise Skeleton for the spike.
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<'home' | 'history' | 'household' | 'settings'>('home');
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-4 pb-4 pt-6">
        <Text className="font-manrope-extrabold text-title text-foreground">
          November 2026
        </Text>

        <Card className="gap-3 rounded-card bg-card p-4">
          {loading ? (
            <>
              <SkeletonText className="h-9 w-40" />
              <Skeleton className="h-2 w-full rounded-full" />
            </>
          ) : (
            <>
              <Text className="font-manrope-extrabold text-hero text-foreground">
                {money(collectedCents)}
                <Text className="font-manrope-medium text-body text-on-surface-variant">
                  {' '}
                  of {money(totalCents)} collected
                </Text>
              </Text>
              <Progress value={(collectedCents / totalCents) * 100} className="h-2 w-full">
                <ProgressFilledTrack className="bg-primary" />
              </Progress>
            </>
          )}
        </Card>

        <Alert className="gap-2 rounded-alert bg-warning-tint border border-warning-line">
          <AlertIcon as={AlertTriangle} className="text-warning" />
          <AlertText className="font-manrope-medium text-body text-on-warning-container">
            Aircon servicing is due this month.
          </AlertText>
        </Alert>

        <Accordion type="single" className="gap-2 rounded-card bg-card">
          {people.map((person) => (
            <AccordionItem key={person.name} value={person.name} className="border-b border-outline-variant last:border-b-0">
              <AccordionHeader>
                <AccordionTrigger className="flex-row items-center justify-between px-4 py-3">
                  {({ isExpanded }: { isExpanded: boolean }) => (
                    <>
                      <View className="flex-1 flex-row items-center gap-3">
                        <View>
                          <Text className="font-manrope-bold text-label text-foreground">
                            {person.name}
                          </Text>
                          <Text className="font-manrope-medium text-caption text-on-surface-variant">
                            {person.role}
                          </Text>
                        </View>
                      </View>
                      <Text className="font-manrope-extrabold text-sheet-title text-foreground">
                        {money(person.totalCents)}
                      </Text>
                      <Badge
                        className={
                          'ml-3 rounded-full ' +
                          (person.paid ? 'bg-success-container' : 'bg-warning-container')
                        }
                      >
                        <BadgeText
                          className={
                            'font-manrope-semibold text-caption ' +
                            (person.paid ? 'text-on-success-container' : 'text-on-warning-container')
                          }
                        >
                          {person.paid ? 'Paid' : 'Due'}
                        </BadgeText>
                      </Badge>
                      <AccordionIcon
                        as={ChevronDown}
                        className={'ml-2 text-on-surface-variant ' + (isExpanded ? 'rotate-180' : '')}
                      />
                    </>
                  )}
                </AccordionTrigger>
              </AccordionHeader>
              <AccordionContent className="gap-1 px-4 pb-3">
                {person.lines.map((line) => (
                  <View key={line.label} className="flex-row justify-between">
                    <AccordionContentText className="font-manrope-medium text-body text-on-surface-variant">
                      {line.label}
                    </AccordionContentText>
                    <AccordionContentText className="font-manrope-medium text-body text-on-surface-variant">
                      {money(line.cents)}
                    </AccordionContentText>
                  </View>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <AddChargeSheet />
      </ScrollView>
      <BottomNav active={active} onItemPress={setActive} />
    </View>
  );
}
