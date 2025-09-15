import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Users, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type ShiftType = 'morning' | 'evening' | 'night' | 'custom';

interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  shift_type: ShiftType;
  is_active: boolean;
  created_at: string;
}

interface ShiftBooking {
  id: string;
  shift_date: string;
  status: string;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
  shifts: {
    name: string;
  } | null;
}

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    shift_type: 'morning' as ShiftType
  });

  useEffect(() => {
    if (isAdmin) {
      fetchShifts();
      fetchBookings();
    }
  }, [isAdmin]);

  const fetchShifts = async () => {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('shift_bookings')
        .select(`
          *,
          profiles (full_name, email),
          shifts (name)
        `)
        .order('shift_date', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    // Handle overnight shifts
    if (diff < 0) {
      diff += 24;
    }
    
    return Math.round(diff);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const duration = calculateDuration(formData.start_time, formData.end_time);
    
    try {
      const shiftData = {
        ...formData,
        duration_hours: duration
      };

      if (editingShift) {
        const { error } = await supabase
          .from('shifts')
          .update(shiftData)
          .eq('id', editingShift.id);
        
        if (error) throw error;
        toast.success('Shift updated successfully');
      } else {
        const { error } = await supabase
          .from('shifts')
          .insert([shiftData]);
        
        if (error) throw error;
        toast.success('Shift created successfully');
      }

      setIsDialogOpen(false);
      setEditingShift(null);
      setFormData({ name: '', start_time: '', end_time: '', shift_type: 'morning' });
      fetchShifts();
    } catch (error) {
      console.error('Error saving shift:', error);
      toast.error('Failed to save shift');
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      start_time: shift.start_time,
      end_time: shift.end_time,
      shift_type: shift.shift_type
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (shiftId: string) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;
      toast.success('Shift deleted successfully');
      fetchShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
      toast.error('Failed to delete shift');
    }
  };

  const toggleShiftStatus = async (shift: Shift) => {
    try {
      const { error } = await supabase
        .from('shifts')
        .update({ is_active: !shift.is_active })
        .eq('id', shift.id);

      if (error) throw error;
      toast.success(`Shift ${shift.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchShifts();
    } catch (error) {
      console.error('Error updating shift status:', error);
      toast.error('Failed to update shift status');
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getShiftTypeColor = (type: string) => {
    const colors = {
      'morning': 'bg-primary/10 text-primary',
      'evening': 'bg-secondary/10 text-secondary-foreground',
      'night': 'bg-accent/10 text-accent-foreground',
      'custom': 'bg-muted/10 text-muted-foreground'
    };
    return colors[type as keyof typeof colors] || 'bg-muted/10 text-muted-foreground';
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to access this page.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Loading admin panel...</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage shifts and bookings</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Shifts</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{shifts.length}</div>
              <p className="text-xs text-muted-foreground">
                {shifts.filter(s => s.is_active).length} active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Bookings</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bookings.filter(b => {
                  const bookingDate = new Date(b.shift_date);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return bookingDate >= weekAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Shifts Management */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Manage Shifts</h2>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingShift(null);
                  setFormData({ name: '', start_time: '', end_time: '', shift_type: 'morning' });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingShift ? 'Edit Shift' : 'Create New Shift'}</DialogTitle>
                  <DialogDescription>
                    {editingShift ? 'Update the shift details.' : 'Add a new shift to the schedule.'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Shift Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Morning Shift"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input
                        id="start_time"
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="end_time">End Time</Label>
                      <Input
                        id="end_time"
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="shift_type">Shift Type</Label>
                    <Select value={formData.shift_type} onValueChange={(value: ShiftType) => setFormData({ ...formData, shift_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="evening">Evening</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingShift ? 'Update' : 'Create'} Shift
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <Card key={shift.id} className={`${!shift.is_active ? 'opacity-60' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{shift.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge className={getShiftTypeColor(shift.shift_type)}>
                        {shift.shift_type}
                      </Badge>
                      <Badge variant={shift.is_active ? "default" : "secondary"}>
                        {shift.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <div>Time: {formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                    <div>Duration: {shift.duration_hours} hours</div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(shift)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleShiftStatus(shift)}
                    >
                      {shift.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Shift</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this shift? This will also remove all associated bookings. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(shift.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete Shift
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Bookings</h2>
          
          {bookings.length === 0 ? (
            <Card className="p-8 text-center">
              <CardDescription>No bookings found.</CardDescription>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="p-4 font-medium">User</th>
                        <th className="p-4 font-medium">Shift</th>
                        <th className="p-4 font-medium">Date</th>
                        <th className="p-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 10).map((booking) => (
                        <tr key={booking.id} className="border-b last:border-b-0">
                          <td className="p-4">
                            <div>
                              <div className="font-medium">{booking.profiles?.full_name || 'Unknown'}</div>
                              <div className="text-sm text-muted-foreground">{booking.profiles?.email}</div>
                            </div>
                          </td>
                          <td className="p-4">{booking.shifts?.name}</td>
                          <td className="p-4">{new Date(booking.shift_date).toLocaleDateString()}</td>
                          <td className="p-4">
                            <Badge variant="outline">{booking.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;