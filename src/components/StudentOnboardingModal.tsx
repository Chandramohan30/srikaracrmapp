import React, { useState } from 'react';
import { 
  X, Check, ChevronRight, ChevronLeft, User, BookOpen, 
  GraduationCap, CreditCard, Sparkles, AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Course, Trainer } from '../types/crm';
import { db, getMonthNamesFromDate, splitAmountIntoTwoInstallments } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from './StatusBadges';

interface StudentOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StudentOnboardingModal: React.FC<StudentOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);

  // Wizard Step (1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    alternate_phone: '',
    date_of_birth: '2003-01-15',
    gender: 'Male',
    address: '',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    qualification: 'B.E Computer Science',
    college: '',
    passing_year: '2025',
    // Step 2: Course
    course_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    // Step 3: Trainer
    trainer_id: ''
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Courses and Trainers from Master
  React.useEffect(() => {
    if (isOpen) {
      const allCourses = db.getCourses().filter(c => c.status === 'active');
      const allTrainers = db.getTrainers().filter(t => t.status === 'active');
      setCourses(allCourses);
      setTrainers(allTrainers);
      if (allCourses.length > 0 && !formData.course_id) {
        setFormData(prev => ({ ...prev, course_id: allCourses[0].id }));
      }
      if (allTrainers.length > 0 && !formData.trainer_id) {
        setFormData(prev => ({ ...prev, trainer_id: allTrainers[0].id }));
      }
      setCurrentStep(1);
      setFormError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Selected Course Object (Fetches base price automatically, rule 2 & 3)
  const selectedCourse = courses.find(c => c.id === formData.course_id) || courses[0];
  // Selected Trainer Object
  const selectedTrainer = trainers.find(t => t.id === formData.trainer_id) || trainers[0];

  // Calculated 2 Installments for Step 4 & 5
  const coursePrice = selectedCourse ? selectedCourse.base_price : 30000;
  const [inst1, inst2] = splitAmountIntoTwoInstallments(coursePrice);
  const months = getMonthNamesFromDate(formData.joining_date, 2);

  // Step Validation
  const validateStep = (step: number): boolean => {
    setFormError(null);
    if (step === 1) {
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        setFormError('Please enter student first and last name.');
        return false;
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        setFormError('Please enter a valid email address.');
        return false;
      }
      if (!formData.phone.trim() || formData.phone.length < 10) {
        setFormError('Please enter a valid 10-digit phone number.');
        return false;
      }
      if (!formData.address.trim()) {
        setFormError('Please enter address.');
        return false;
      }
      if (!formData.qualification.trim()) {
        setFormError('Please select or specify student qualification.');
        return false;
      }
    }
    if (step === 2) {
      if (!formData.course_id) {
        setFormError('Please select a course.');
        return false;
      }
      if (!formData.joining_date) {
        setFormError('Please select a joining date.');
        return false;
      }
    }
    if (step === 3) {
      if (!formData.trainer_id) {
        setFormError('Please assign a trainer.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const handlePrev = () => {
    setFormError(null);
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleConfirmAndOnboard = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await db.onboardStudent({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        alternate_phone: formData.alternate_phone,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        qualification: formData.qualification,
        college: formData.college,
        passing_year: formData.passing_year,
        course_id: selectedCourse.id,
        trainer_id: selectedTrainer.id,
        joining_date: formData.joining_date
      }, currentUser);

      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch (e) {
        // ignore
      }

      window.alert(
        `Student onboarded successfully!\n\nLogin Email: ${result.student.email}\nPassword (Student ID): ${result.student.student_code}`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to onboard student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsConfig = [
    { num: 1, label: 'Personal' },
    { num: 2, label: 'Course' },
    { num: 3, label: 'Trainer' },
    { num: 4, label: 'Installments' },
    { num: 5, label: 'Confirm' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-base font-bold text-white leading-tight">
              Student Onboarding Wizard
            </h2>
            <p className="text-xs text-slate-400">
              5-Step Admissions and Automated Payment Setup
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            {stepsConfig.map((s, idx) => {
              const isPassed = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <React.Fragment key={s.num}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isPassed
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-red-700 text-white ring-2 ring-red-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isPassed ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${
                      isCurrent ? 'text-slate-900 font-bold' : 'text-slate-500'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {idx < stepsConfig.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${
                      currentStep > s.num ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: Personal Information */}
          {currentStep === 1 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-1">
                Step 1: Student Personal & Academic Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arun"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kumar"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 97890 12345"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gender & DOB
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Highest Qualification *
                  </label>
                  <select
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value="B.E Computer Science">B.E / B.Tech Computer Science</option>
                    <option value="B.Tech IT">B.Tech IT</option>
                    <option value="BCA">BCA</option>
                    <option value="MCA">MCA</option>
                    <option value="B.Sc Computer Science">B.Sc Computer Science</option>
                    <option value="B.Com / Finance">B.Com / Finance</option>
                    <option value="Other Degree">Other Degree / Diploma</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    College / Institute & Passing Year
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="e.g. PSG Tech / CIT"
                      value={formData.college}
                      onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                      className="col-span-2 p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <input
                      type="text"
                      placeholder="Year (2025)"
                      value={formData.passing_year}
                      onChange={(e) => setFormData({ ...formData, passing_year: e.target.value })}
                      className="p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Permanent Address *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Door No, Street Name, Area"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Course Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-1">
                Step 2: Course Selection & Automatic Base Pricing
              </h3>

            

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Course *
                  </label>
                  <select
                    value={formData.course_id}
                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_name} — {formatCurrency(c.base_price)} ({c.duration})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCourse && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Course Duration:</span>
                      <span className="font-bold text-slate-900">{selectedCourse.duration}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 font-medium">Course Base Fee (From Master):</span>
                      <span className="text-base font-extrabold text-red-700 tabular-nums">
                        {formatCurrency(selectedCourse.base_price)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 pt-1 border-t">
                      {selectedCourse.description}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-red-600"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Installment months 1, 2, and 3 will automatically start from this joining month.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Trainer Assignment */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-1">
                Step 3: Technical Trainer Assignment
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign Faculty / Trainer *
                  </label>
                  <select
                    value={formData.trainer_id}
                    onChange={(e) => setFormData({ ...formData, trainer_id: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-semibold text-slate-900 outline-none focus:ring-1 focus:ring-red-600"
                  >
                    {trainers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.trainer_code}) — {t.specialization} [{t.experience}]
                      </option>
                    ))}
                  </select>
                </div>

                {selectedTrainer && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-red-700" />
                      <div>
                        <div className="font-bold text-slate-900">{selectedTrainer.name}</div>
                        <div className="text-[11px] text-slate-500">{selectedTrainer.specialization}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t flex flex-wrap gap-1">
                      {selectedTrainer.skills.map((sk) => (
                        <span key={sk} className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Automated 3-Installment Generation Preview */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-1">
                Step 4: Automatic 2-Installment Plan Setup
              </h3>

              

              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-semibold text-slate-700">
                    <tr>
                      <th className="p-3">Installment</th>
                      <th className="p-3">Month</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">Installment 1</td>
                      <td className="p-3 text-slate-700">{months[0]?.month}</td>
                      <td className="p-3 text-slate-500">{months[0]?.dueDate}</td>
                      <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrency(inst1)}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">Installment 2</td>
                      <td className="p-3 text-slate-700">{months[1]?.month}</td>
                      <td className="p-3 text-slate-500">{months[1]?.dueDate}</td>
                      <td className="p-3 text-right font-bold text-slate-900 tabular-nums">
                        {formatCurrency(inst2)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                      <td colSpan={3} className="p-3 text-right text-slate-700">
                        Total Course Fee:
                      </td>
                      <td className="p-3 text-right text-red-700 text-sm tabular-nums">
                        {formatCurrency(inst1 + inst2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 5: Final Confirmation Summary */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-1">
                Step 5: Confirmation & Admission Summary
              </h3>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 border-b pb-2">
                  <div>
                    <span className="text-slate-500 block">Student:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formData.first_name} {formData.last_name}
                    </span>
                    <span className="text-[11px] text-slate-500 block">{formData.email} · {formData.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Course & Fee:</span>
                    <span className="font-bold text-slate-900">
                      {selectedCourse.course_name}
                    </span>
                    <span className="font-bold text-red-700 block">
                      {formatCurrency(coursePrice)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b pb-2">
                  <div>
                    <span className="text-slate-500 block">Assigned Trainer:</span>
                    <span className="font-semibold text-slate-900">
                      {selectedTrainer.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block">{selectedTrainer.specialization}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Joining Date:</span>
                    <span className="font-semibold text-slate-900">
                      {formData.joining_date}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 font-semibold block mb-1">
                    Generated Installment Plan:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-white rounded border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">INST 1 ({months[0]?.month})</span>
                      <span className="font-bold text-slate-900">{formatCurrency(inst1)}</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block font-bold">INST 2 ({months[1]?.month})</span>
                      <span className="font-bold text-slate-900">{formatCurrency(inst2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-xs transition-colors"
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmAndOnboard}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-extrabold text-white bg-red-700 hover:bg-red-800 rounded-lg shadow-sm transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                Confirm & Onboard Student
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
