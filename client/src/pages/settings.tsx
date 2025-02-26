import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

export default function Settings() {
  const { data: settings } = useQuery({
    queryKey: ["/api/settings/user"],
    queryFn: async () => {
      const response = await fetch("/api/settings/user");
      if (!response.ok) {
        throw new Error("Failed to fetch user settings");
      }
      return response.json();
    },
  });

  const { data: systemSettings } = useQuery({
    queryKey: ["/api/settings/system"],
    queryFn: async () => {
      const response = await fetch("/api/settings/system");
      if (!response.ok) {
        throw new Error("Failed to fetch system settings");
      }
      return response.json();
    },
    enabled: true, // TODO: Check user permissions
  });

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8">
      <div className="relative">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account and system preferences
        </p>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/60 rounded-full mt-4"/>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your profile information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your name" defaultValue={settings?.name} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Your email" defaultValue={settings?.email} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select defaultValue={settings?.department}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="quality">Quality Control</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select defaultValue={settings?.theme}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your password and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline">Change Password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="production-alerts" className="flex flex-col space-y-1">
                    <span>Production Alerts</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      Get notified about production status changes
                    </span>
                  </Label>
                  <Switch id="production-alerts" defaultChecked={settings?.notifications?.production} />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="quality-checks" className="flex flex-col space-y-1">
                    <span>Quality Checks</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      Receive notifications for quality control results
                    </span>
                  </Label>
                  <Switch id="quality-checks" defaultChecked={settings?.notifications?.quality} />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="maintenance-reminders" className="flex flex-col space-y-1">
                    <span>Maintenance Reminders</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      Get reminded about scheduled maintenance
                    </span>
                  </Label>
                  <Switch id="maintenance-reminders" defaultChecked={settings?.notifications?.maintenance} />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="system-alerts" className="flex flex-col space-y-1">
                    <span>System Alerts</span>
                    <span className="font-normal text-sm text-muted-foreground">
                      Receive notifications about system changes
                    </span>
                  </Label>
                  <Switch id="system-alerts" defaultChecked={settings?.notifications?.system} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Methods</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                      <span>Email Notifications</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Receive notifications via email
                      </span>
                    </Label>
                    <Switch id="email-notifications" defaultChecked={settings?.notifications?.email} />
                  </div>

                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="push-notifications" className="flex flex-col space-y-1">
                      <span>Push Notifications</span>
                      <span className="font-normal text-sm text-muted-foreground">
                        Receive push notifications in browser
                      </span>
                    </Label>
                    <Switch id="push-notifications" defaultChecked={settings?.notifications?.push} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings and parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Production Quality Thresholds</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cutting-tolerance">Cutting Tolerance (mm)</Label>
                    <Input 
                      id="cutting-tolerance" 
                      type="number" 
                      step="0.1"
                      defaultValue={systemSettings?.production?.quality_thresholds?.cutting?.tolerance}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="polishing-gloss">Polishing Gloss Level (%)</Label>
                    <Input 
                      id="polishing-gloss" 
                      type="number"
                      defaultValue={systemSettings?.production?.quality_thresholds?.polishing?.glossLevel}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">System Maintenance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="backup-schedule">Backup Schedule</Label>
                    <Input 
                      id="backup-schedule" 
                      placeholder="0 0 * * *"
                      defaultValue={systemSettings?.system?.maintenance?.backupSchedule}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data-retention">Data Retention (days)</Label>
                    <Input 
                      id="data-retention" 
                      type="number"
                      defaultValue={systemSettings?.system?.maintenance?.dataRetentionDays}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save System Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}